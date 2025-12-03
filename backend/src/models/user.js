export default (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      photoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'Users',
      hooks: {
        beforeValidate: (user) => {
          if (user.email) {
            user.email = user.email.toLowerCase();
          }
        },
      },
    }
  );

  User.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
  };

  return User;
};

