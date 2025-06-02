import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { ApiException } from 'src/common/filters/exception';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }
  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new ApiException(
        [
          {
            field: 'id',
            message: 'User not found',
            value: id,
          },
        ],
        404,
      ); // Status code 404 (Not Found)
    }
    return user;
  }
  async create(
    userData: Partial<User>,
    options?: { session?: ClientSession },
  ): Promise<UserDocument> {
    const createdUser = new this.userModel(userData);
    return createdUser.save(options);
  }

  async updateProfileStatus(
    userId: string,
    profileComplete: boolean,
  ): Promise<UserDocument> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { profileComplete },
      { new: true },
    );
    if (!updatedUser) {
      throw new ApiException(
        [
          {
            field: 'id',
            message: 'User not found',
            value: userId,
          },
        ],
        404,
      );
    }
    return updatedUser;
  }
}
